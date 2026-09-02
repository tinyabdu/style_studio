from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, StateGraph

from agents.nodes.compose import compose_node
from agents.nodes.generate_assets import generate_assets_node
from agents.nodes.plan_design import plan_design_node
from agents.nodes.qa_check import qa_check_node
from agents.state import DesignState

MAX_RETRIES = 1


def _should_retry(state: DesignState) -> str:
    if state.get("qa_issues") and state.get("retry_count", 0) < MAX_RETRIES:
        return "retry"
    return "done"


def build_graph():
    graph = StateGraph(DesignState)

    # One combined LLM call does both brief analysis and layout planning —
    # halves the number of Gemini calls per generation (important on tight
    # free-tier quotas).
    graph.add_node("plan_design", plan_design_node)
    graph.add_node("generate_assets", generate_assets_node)
    graph.add_node("compose", compose_node)
    graph.add_node("qa_check", qa_check_node)

    graph.set_entry_point("plan_design")
    graph.add_edge("plan_design", "generate_assets")
    graph.add_edge("generate_assets", "compose")
    graph.add_edge("compose", "qa_check")
    graph.add_conditional_edges(
        "qa_check", _should_retry, {"retry": "plan_design", "done": END}
    )

    # In-memory checkpointer is enough for local/dev use; swap for a Redis or
    # Postgres checkpointer in production so runs survive a server restart.
    return graph.compile(checkpointer=MemorySaver())


design_graph = build_graph()
